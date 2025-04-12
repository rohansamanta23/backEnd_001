class ApiReasponse {
  constructor(data, statusCode, message = "success") {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
    this.error = null;
  }

}
export default ApiReasponse;