const asyncHandler = (fn) => async(req,res,next) =>{
    try{
        await fn(req,res,next)
    }
    catch(err){
        res.status(500).json({
            message: "Something went wrong",
            error: err.message
        })
        next(err)
    }
}

export {asyncHandler};