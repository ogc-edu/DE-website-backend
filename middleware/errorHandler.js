const errorHandler = (err, req, res, next) => {
  //create copy to modify safely
  let error = {...err};
  error.message = err.message; //err message is non-enumerable, need to assign 
  
  console.log("Error name: ", err.name);  //default error object is undefined 
  console.log("Error code: ", err.code);
  console.log("Error at line: ", err.stack.split('\n')[1].trim());

  //Mongoose errors
  //typical error, err.name = ReferenceError, TypeError, SyntaxError
  //typical error for mongoose and MongoDB, err.name, CastError, 11000(duplicate), ValidationError 
  //err.name, err.message, err.errors.key.message
  //unique for duplicate error, err.keyValue.values Object.keys(err.keyValue)[0]
  if(err.name === 'CastError'){
    const message = `Resource not found with id : ${err.value}`;
    error = { statusCode: 404, message };
  }

  if(err.code === 11000){   //backup for race condition 
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered for field: ${field}`;
    error = { statusCode: 400, message };
  }

  if(err.name === `ValidationError`){
    const message = Object.keys(err.errors).map((val) => val.message)//return an array of err.errors.key.messages
    error = {statusCode: 400, message: message.join(', ')}; //join all messages with comma
  }

  if(err.name === 'Error'){   //manual JS error object
    error.statusCode = 400;
  }
  res.status(error.statusCode).json({
    success: false,
    error: error.message || 'Server Error',
  })
};

export default errorHandler;

