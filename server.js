import express from 'express';
import {data} from "./getDb.js";
import cors from 'cors';

const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(data)
  console.log("[server.js] get 요청이 오면 찍히는 콘솔:",data)
})

app.post("/brand_name", (req,res)=>{
    let brand = req.body;
    console.log("brand:",brand);
  
  });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})