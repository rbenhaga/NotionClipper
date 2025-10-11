/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidNotionBlock(): R;
      toHaveRichTextContent(content: string): R;
      toHaveBlockTypes(types: string[]): R;
      toBeWithinPerformanceThreshold(threshold: number): R;
    }
  }

  var testHelpers: any;
}

export {};