import express from 'express'
// ou const express = require('express') porem esse modo esta "ultrapassado"

/*Rotas precisam de:
  1- Tipo de rota / método HTTP
  2- Endereço*/

//app.get('/usuarios') - traz os usuarios     : Listar 
//app.post('/usuarios')- cria novo usuario    : Criar
//app.put('/usuarios') - edita um usuario     : Editar vários
//app.delete('/usuarios') - deleta um usuario : Deletar

const app = express()
app.use(express.json())

const users = []

//Criando usuarios (temporario até criar um bando de dados)
app.post('/usuarios', (req, res) => {

  users.push(req.body)
  res.status(201).json(req.body)

})

//Listando usuarios
app.get('/usuarios',  (req, res) => {
  res.status(200).json(users)
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})

//"node --watch server.js" executa toda vez que abrir o VSS
//adiciona tambem a extensão THUNDER CLIENT para teste da requisição

/*
   Criar nossa API de Usuários 
  -Criar um usuário
  -Listar todos os usuários
  -Editar um usuário
  -Deletar um usuário
*/

//CONTINUAR APARTIR DE 38:00, porem ele usa o MongoDB, temos que adaptar para Supabase
// implementar a chuquinha no Cascao
// sera realizado dia 15/07/2026

