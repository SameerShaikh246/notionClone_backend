import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log(
      `Connected To Mongodb Database ${mongoose.connection.host}`.bgGreen.white
    );
  } catch (error) {
    console.log(`error in mongodb : ${error}`.bgRed.white);
  }
};

export default connectDB;
