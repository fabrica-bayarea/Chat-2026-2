import { criarApiFalsa } from "./api-falsa.js";

const { server } = criarApiFalsa();
server.listen(4000, () => {
  console.log("API falsa em http://localhost:4000 (tente /matriculas/12345)");
});