import pkg from 'pg';
const { Client } = pkg;
var data=""

function execute(query){
  console.log("[getDb.js] : hi!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  const client = new Client({
    user: "data_user",
    host: "prd-dt-redshift.conhugwtudej.ap-northeast-2.redshift.amazonaws.com",
    database: "fnf",
    password: "Duser2022!#",
    port: 5439,
  });
  
  client.connect();
  
  client
    .query(query)
    .then((res) => {
      data=res.rows;
      console.log("[getDb]: 쿼리로 추출한 데이터:",data)
  
      client.end();
    })
    .catch((e) => console.error(e.stack));
  
}




export {execute,data};