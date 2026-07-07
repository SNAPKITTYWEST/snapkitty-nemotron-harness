declare module "tau-prolog" {
  namespace pl {
    function create(): pl.type.Session;

    function format_answer(answer: any): string;

    namespace type {
      class Session {
        consult(src: string, callback?: (ok?: any) => void): void;
        query(goal: string): void;
        answer(callback: (answer: any) => void): void;
        rules: Record<string, any>;
      }
    }
  }
  export default pl;
}

declare module "*.pl?raw" {
  const src: string;
  export default src;
}
