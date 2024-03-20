import mongoose from "mongoose";
const ConnectDB = async () => {
    try {
        const options = await mongoose.connect(`${process.env.MONGO_URL}/test`)
        console.log("db connected "+ options.connection.host);
    } catch (error) {
        console.log("Error db FAILED: "+error);
    }
}

export default ConnectDB;