import mongoose from "mongoose"
export const dbConnect=async()=>{
   const conn= await  mongoose.connect('mongodb://localhost:27017/lms');
   if(conn){
    console.log("Db connected successfully............"); 
   }
}