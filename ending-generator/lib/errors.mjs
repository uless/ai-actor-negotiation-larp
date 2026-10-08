export class PublicError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "PublicError";
    this.status = status;
    this.code = code;
  }
}
