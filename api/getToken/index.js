const { CommunicationIdentityClient } = require('@azure/communication-identity');

module.exports = async function (context, req) {

  context.log("Azure Communication Services - Access Tokens Quickstart")

  // This code demonstrates how to fetch your connection string
  // from an environment variable.
  const connectionString = process.env['COMMUNICATION_SERVICES_CONNECTION_STRING'];

  // Instantiate the identity client
  const identityClient = new CommunicationIdentityClient(connectionString);

  let identityResponse = await identityClient.createUser();
  context.log(`\nCreated an identity with ID: ${identityResponse.communicationUserId}`);

  // Issue an access token with the "voip" scope for an identity
  const tokenResponse = await identityClient.getToken(identityResponse, ["voip"]);
  const { token, expiresOn } = tokenResponse;
  context.log(`\nIssued an access token with 'voip' scope that expires at ${expiresOn}:`);

  context.log(token);
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: Object.assign(tokenResponse, identityResponse)
  };
}