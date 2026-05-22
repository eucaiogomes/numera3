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

export async function extractTokensFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string[]> {
  ensurePromiseWithResolvers();

  const pdfjsLib = await import('pdfjs-dist');

  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
    }
  } catch {
    // Fallback: try without explicitly setting worker source
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    } catch {
      // Continue anyway
    }
  }

  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
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
