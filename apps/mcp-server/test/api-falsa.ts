import http from "node:http";

// API Mock de mentira, só para testes. Segue o contrato combinado:
//   GET /matriculas/{matricula}  →  200 com dados  |  404 { erro }
export function criarApiFalsa() {
  const requisicoes: string[] = [];

  const server = http.createServer((req, res) => {
    requisicoes.push(req.url ?? "");

    if (req.url === "/matriculas/12345") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          matricula: "12345",
          nome: "Maria Silva",
          curso: "Tecnologia da Informação",
          situacao: "ativa",
        }),
      );
    } else if (req.url === "/matriculas/erro500") {
      res.writeHead(500).end();
    } else if (req.url === "/matriculas/lixo") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("isto nao e json");
    } else if (req.url === "/matriculas/lenta") {
      // nunca responde: o timeout da ferramenta tem que cortar
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ erro: "matricula_nao_encontrada" }));
    }
  });

  return { server, requisicoes };
}