# Zona Morta: A Última Esperança — edição aprimorada

## Recursos
- Multiplayer online para 2 a 4 jogadores usando salas por código.
- Tabuleiro tático de 30 setores com visual de sobrevivência.
- Personagens com habilidades e recursos iniciais.
- Dado virtual, turnos sincronizados e registro da partida.
- Eventos aleatórios, exploração, itens, cura, comida e combate.
- Zumbi Alfa com pontos de vida e contra-ataque.
- Animação do resultado do dado e efeitos sonoros simples gerados no navegador.
- Interface responsiva para desktop e telas menores.

## Executar
Requer Node.js 18+.
```bash
npm install
npm start
```
Abra http://localhost:3000.

## Jogar em computadores diferentes
Publique a pasta em uma hospedagem Node.js que mantenha o processo ativo e suporte WebSockets (Render, Railway ou VPS).
- Build: `npm install`
- Start: `npm start`
- A aplicação usa `process.env.PORT`.
Depois compartilhe o endereço público e o código da sala.

## Regras rápidas
1. Um jogador cria a sala e compartilha o código.
2. De 2 a 4 jogadores entram; o anfitrião inicia.
3. Na sua vez, lance o dado, resolva o setor e use itens se necessário.
4. Encontre combustível no setor 12, rádio no 18 e bateria no 24.
5. Alcance o setor 29 e ataque o Zumbi Alfa até derrotá-lo.
6. Com os três itens e o chefe derrotado, avance à base no setor 30 para vencer.

## Limitações desta versão
- Estado das salas armazenado em memória: reiniciar o servidor encerra partidas.
- A reconexão automática de um jogador desconectado ainda não recupera a identidade anterior.
- Não há banco de dados, chat livre ou sistema de contas.
- O projeto é um protótipo funcional para testes, não um serviço comercial endurecido.
