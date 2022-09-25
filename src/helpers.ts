export const getMail = (authInfo?: Express.AuthInfo) => {
    if (!authInfo) {
        throw 'No AuthInfo provided';
    }
    return (authInfo as any).preferred_username.toLowerCase();
};
