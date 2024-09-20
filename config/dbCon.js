const mongoose=require('mongoose');

//Database Connection

const databaseConnection=()=>{
    mongoose.connect(process.env.URL).then((data)=>{
        console.log("Database Connected Successfully");
    }).catch((error)=>{
        console.log("Db con error ",error);
    })
}

module.exports=databaseConnection;