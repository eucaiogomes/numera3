import pdfWorkerLibUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type * as PdfWorkerModule from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

function ensurePromiseWithResolvers() {
  const promiseConstructor = Promise as typeof Promise & {
    withResolvers?: <T>() => PromiseWithResolvers<T>;
  };

  if (promiseConstructor.withResolvers) return;

  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: <T>(): PromiseWithResolvers<T> => {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      });

      return { promise, resolve, reject };
    },
  });
}

async function loadPdfJs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    return await import('pdfjs-dist');
  }
}

let workerObjectUrl: string | null = null;

function shouldUseMainThreadPdfWorker(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const isApplePlatform = /Mac|iPhone|iPad|iPod/i.test(platform);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg/i.test(userAgent);

  return isApplePlatform && isSafari;
}

function createPdfWorkerUrl(): string {
  if (workerObjectUrl) return workerObjectUrl;

  const workerSource = `
if (!Promise.withResolvers) {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: () => {
      let resolve;
      let reject;
      const promise = new Promise((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      });
      return { promise, resolve, reject };
    },
  });
}

await import(${JSON.stringify(new URL(pdfWorkerLibUrl, globalThis.location?.href).href)});
`;

  workerObjectUrl = URL.createObjectURL(
    new Blob([workerSource], { type: 'text/javascript' }),
  );

  return workerObjectUrl;
}

async function configurePdfWorker(pdfjsLib: Awaited<ReturnType<typeof loadPdfJs>>) {
  if (shouldUseMainThreadPdfWorker()) {
    const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs') as typeof PdfWorkerModule;
    (globalThis as typeof globalThis & { pdfjsWorker?: typeof PdfWorkerModule }).pdfjsWorker = workerModule;
    pdfjsLib.GlobalWorkerOptions.workerPort = null;
    return;
  }

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = createPdfWorkerUrl();
  }
}

export async function extractTokensFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string[]> {
  ensurePromiseWithResolvers();

  const pdfjsLib = await loadPdfJs();
  await configurePdfWorker(pdfjsLib);

  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const data = buffer.slice(0);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    isEvalSupported: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    useSystemFonts: true,
    useWorkerFetch: false,
  }).promise;
  const tokens: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      tokens.push(item.str.trim());
    }
  }

  return tokens;
}
