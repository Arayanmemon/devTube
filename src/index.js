import { app } from "./app.js";
import ConnectDB from "./db.js";
import dotenv from "dotenv";

dotenv.config({
    path: './.env'
})

ConnectDB()
.then(
    app.listen(process.env.PORT, ()=>{
        console.log(`server connected on ${process.env.PORT}`);
    })
)
.catch((error)=>{
    console.log("Error " +error)
})

// ;(async()=>{
//     try {
//         await mongoose.connect('mongodb+srv://arayan:A12345678@cluster0.6d3vprl.mongodb.net/?retryWrites=true&w=majority')
//         console.log("db connected");
//     } catch (error) {
//         console.log("Error db FAILED: "+error);
//     }
// })()