class ApiError extends Error {
    constructor(message="somthing went wrong", statusCode,errors=[],stack="") {
        super(message);
        this.message = message;
        this.data = null;
        this.success = false;
        this.statusCode = statusCode;
        this.errors = errors;
        if(stack) {
            this.stack = stack;
        }else {
            Error.captureStackTrace(this, this.constructor);
        }
    } 
}
export {ApiError};
