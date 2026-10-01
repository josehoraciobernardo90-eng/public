# Teste móvel com Expo Go

O projeto Expo abre a aplicação web atual em uma WebView. Não é uma conversão das telas para componentes nativos.

## Iniciar

1. No computador, inicie o servidor web na raiz do projeto:

   ```sh
   npm run dev
   ```

2. Em outro terminal, inicie o Expo:

   ```sh
   npm run mobile
   ```

3. Abra o Expo Go no telefone e leia o QR code exibido pelo Expo. Computador e telefone devem estar na mesma rede Wi-Fi.
4. O app abre automaticamente o servidor configurado em `mobile/App.tsx`. Use o botão **Servidor** no cabeçalho para trocar o endereço se o IPv4 do computador mudar.

No Windows, use `ipconfig` para localizar o endereço IPv4 da conexão Wi-Fi. Não informe `localhost`: no telefone, esse endereço aponta para o próprio telefone. Se a conexão falhar, permita o Node.js na rede privada do Firewall do Windows.

O acesso operacional permanece bloqueado em dispositivos Android, conforme a regra existente no aplicativo.

## Gerar APK

Para gerar um APK instalável no Android usando o EAS Build:

```sh
npm run build:apk
```

O comando exige uma conta Expo autenticada e envia o projeto para compilação na nuvem. Ao concluir, o EAS informa um link para baixar o APK. O APK continua carregando o servidor web configurado em `mobile/App.tsx`; para o teste local, mantenha `npm run dev` em execução.