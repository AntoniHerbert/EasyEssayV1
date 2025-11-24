Para rodar o projeto é necessário:

Docker;

Postgres;

O arquivo docker-compose.dev.yml já tem variáveis de ambiente necessárias, mas espera que o postgres esteja instalado localmente no computador;

Você pode desejar alterar o nome do banco de dados no docker,  mas caso não, o nome padrão do banco é "EasyEssay_db";

Você precisa criar uma chave de api no Groq e atualizar a chave falsa usada como template no docker-compose do repositório;

Ao clonar o repositório e terminar as tarefas anteriormente listadas rodar o comando: "docker compose -f docker-compose.dev.yml up --build -d" na pasta do clone.

---

To run the project you need:

Docker;

Postgres;

The docker-compose.dev.yml file already contains the necessary environment variables, but it expects Postgres to be installed locally on your computer;

You may want to change the database name in Docker, but if not, the default database name is "EasyEssay_db";

You need to create an API key in Groq and update the dummy key used as a template in the repository's docker-compose file;

After cloning the repository and completing the previously listed tasks, run the command: "docker compose -f docker-compose.dev.yml up --build -d" in the cloned folder.
