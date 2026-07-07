declare module "tau-prolog" {
  namespace pl {
    function create(): any;
    function format_answer(answer: any): string;
  }
  export default pl;
}

declare module "*.pl?raw" {
  const src: string;
  export default src;
}
