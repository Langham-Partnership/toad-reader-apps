import { getReqOptionsWithAdditions, safeFetch } from './toolbox';

// GETs JSON from the data server. Resolves null instead of rejecting when the
// request or the parse fails (offline, dropped request, server error page).
export const getJsonOrNull = async (url) => {
  let response;
  try {
    response = await safeFetch(
      url,
      getReqOptionsWithAdditions({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    return await response.json();
  } catch (err) {
    console.log(`GET ${url} had an error.`, err.message, response?.status);
    return null;
  }
};
