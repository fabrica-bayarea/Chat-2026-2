import { askAgent, AgentError } from "../chat.js";

const prompts = [
  "Oi!",
  "Quem é você?",
  "O que você consegue fazer?",
  "Qual a capital da frança?",
  "Me conta uma piada.",
  "Qual é o valor da mensalidade do curso de TI?",
  "Certinho, muito obrigado",
  "Boa noite, Ollama, tenha uma ótima noite!"
];

let failed = false;

for (const prompt of prompts) {
  console.log(`\n> ${prompt}`);
  const start = Date.now();
  try {
    const answer = await askAgent(prompt);
    console.log(`${answer}\n(${((Date.now() - start) / 1000).toFixed(1)}s)`);
  } catch (error) {
    failed = true;
    const message = error instanceof AgentError ? `[${error.kind}] ${error.message}` : String(error);
    console.error(`Falhou: ${message}`);
    if (error instanceof AgentError && error.kind !== "timeout") break; // Ollama fora do ar ou modelo ausente: não adianta continuar
  }
}

process.exit(failed ? 1 : 0);