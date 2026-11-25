// Contas FICTÍCIAS de alunos, só para desenvolvimento. As matrículas são as mesmas do
// mock acadêmico (src/mock-academico). As senhas de desenvolvimento estão no README do backend.
// Quando existir cadastro de verdade (EP-05), esta lista sai daqui e vira tabela no banco.

export type AlunoConta = {
  matricula: string;
  nome: string;
  senhaHash: string;
};

export const ALUNOS_DE_DESENVOLVIMENTO: AlunoConta[] = [
  {
    matricula: '12345',
    nome: 'João Silva',
    senhaHash:
      'scrypt$e3de3d49edb825817490dd2148f6b8e0$35263c78f25361934b0c1fc73e5f487593b73ff4abcdcf526739a972ea8085d0047206bb512c8a5c093a1568fc64ad300b8b65ddc81af2a78413347bc9d1b7fd',
  },
  {
    matricula: '2023001',
    nome: 'Maria Souza',
    senhaHash:
      'scrypt$9835a9aa89426d22df8a8aca1d8d41e3$8b6e7cffa21c03b62e1ecc1257949d88648624c6048046ebabc008842787b4443f30e6e86fc97b0b01209adfc5a539889c986c08959c8962c1b37b1b18abd4d2',
  },
];
