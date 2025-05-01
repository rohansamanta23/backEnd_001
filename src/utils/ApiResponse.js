class ApiReasponse {
  constructor(statusCode, data, message = "success") {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
    this.error = null;
  }
}
export { ApiReasponse };
