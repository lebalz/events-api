import { Client } from "@microsoft/microsoft-graph-client";

// No isomorphic-fetch needed!
// import "isomorphic-fetch";

const tenantId = process.env.TENANT_ID as string;
const clientId = process.env.CLIENT_ID as string;
const clientSecret = process.env.GRAPH_CLIENT_SECRET_BACKEND as string;

const scope = "https://graph.microsoft.com/.default";
const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

async function getToken(): Promise<string> {
    console.log("Fetching token...", { tenantId, clientId, clientSecret });
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("scope", scope);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");

    const res = await fetch(tokenEndpoint, {
        method: "POST",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error(`Token request failed: ${res.statusText}`);
    const data = await res.json();
    return data.access_token as string;
}

async function fetchUsersWithGbslEmail(accessToken: string) {
    const client = Client.init({
        authProvider: done => done(null, accessToken),
    });

    const users: { email: string }[] = [];
    let nextLink: string | undefined = `/users?$filter=endsWith(mail,'@gbsl.ch')&$select=mail`;

    while (nextLink) {
        const result = await client.api(nextLink).get();
        users.push(
            ...result.value
                .filter((u: any) => typeof u.mail === "string" && u.mail.endsWith("@gbsl.ch"))
                .map((u: any) => ({ email: u.mail }))
        );
        nextLink = result["@odata.nextLink"];
    }

    return users;
}

async function main() {
    const token = await getToken();
    console.log("Access token acquired.", token);
    console.log('Token payload:', JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()));
    const gbslEmails = await fetchUsersWithGbslEmail(token);
    console.log(gbslEmails);
}

main().catch(console.error);