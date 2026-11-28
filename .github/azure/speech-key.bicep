resource speech 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: 'xiaoan-speech-trial-jpe-20261101'
}
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: 'xiaoan-hd5dc8-kv'
}
resource speechKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'xiaoan-web-azure-speech-key'
  properties: {
    value: speech.listKeys().key1
    attributes: {
      enabled: true
    }
  }
}
