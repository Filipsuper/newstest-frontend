// Studio contains private source text and prompts. Never mount third-party
// page scripts on its direct document load. This is not an access-control
// boundary: a future server Studio still needs authentication and isolation.
export function shouldLoadSiteScripts(pathname) {
    if (typeof pathname !== 'string' || !pathname.startsWith('/')) return false;
    if (pathname === '/bekrafta' || pathname === '/kom-igang') return false;
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
    return pathname !== '/designsystem/stories' && !pathname.startsWith('/designsystem/stories/');
}
