/*
  Hash de senha com bcrypt.

  O hash é de mão única: dá para conferir se uma senha bate com ele, mas não
  dá para descobrir a senha a partir dele. Se o banco vazar, as senhas não vazam.
*/
import bcrypt from "bcryptjs";

// "Custo" do bcrypt: quanto maior, mais lento para um atacante testar senhas.
const CUSTO = 10;

export function gerarHash(senha: string) {
  return bcrypt.hash(senha, CUSTO);
}

export function conferirSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}
