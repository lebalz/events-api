import BaseError, { HttpStatusCode } from "./BaseError";
export class HTTP400Error extends BaseError {
  constructor(description = 'bad request') {
    super('BAD REQUEST', HttpStatusCode.BAD_REQUEST, description, true);
  }
}

export class HTTP401Error extends BaseError {
  constructor(description = 'unauthorized request') {
    super('UNAUTHORIZED', HttpStatusCode.UNAUTHORIZED, description, true);
  }
}
export class HTTP403Error extends BaseError {
  constructor(description = 'forbidden request') {
    super('FORBIDDEN', HttpStatusCode.FORBIDDEN, description, true);
  }
}
export class HTTP404Error extends BaseError {
  constructor(description = 'record not found') {
    super('NOT FOUND', HttpStatusCode.NOT_FOUND, description, true);
  }
}

export class APIError extends BaseError {
  constructor(name: string, httpCode = HttpStatusCode.INTERNAL_SERVER, description = 'internal server error', isOperational = true) {
    super(name, httpCode, description, isOperational);
  }
}