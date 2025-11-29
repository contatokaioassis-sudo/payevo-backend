curl --request POST \
     --url https://apiv2.payevo.com.br/functions/v1/transactions \
     --header 'Content-Type: application/json' \
     --header 'accept: application/json' \
     --header 'authorization: Basic sk_like_B2F9PTs9d7XURxM9ByT1oQ33Tr8SFNbgxWMA6ndCCUPQ9AYx’ \
     --data '
{
  "customer": {
    "name": "Jorge Santos",
    "email": "jorge.santos@gmail.com",
    "phone": "11983272733",
    "document": {
      "number": "04281554645",
      "type": "CPF"
    }
  },
  "paymentMethod": "PIX",
  "pix": {
    "expiresInDays": 1
  },
  "amount": 100,
  "items": [
    {
      "title": "Produto Teste 01",
      "unitPrice": 100,
      "quantity": 1,
      "externalRef": "PRODTESTE01"
    }
  ]
}
'
