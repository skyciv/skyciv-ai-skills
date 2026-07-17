'use strict';

const API_URL = 'https://api.skyciv.com/v3';

class SkyCivError extends Error {
  constructor(message, envelope) {
    super(message);
    this.name = 'SkyCivError';
    this.envelope = envelope;
  }
}

function getCreds() {
  const username = process.env.SKYCIV_USERNAME;
  const key = process.env.SKYCIV_API_KEY;
  if (!username || !key) {
    throw new SkyCivError('Missing SKYCIV_USERNAME / SKYCIV_API_KEY - set them in .env before calling the SkyCiv API.');
  }
  return { username, key };
}

// Runs an ordered list of { function, arguments } calls in a single envelope request.
// Always injects S3D.session.start as the first call so the whole batch shares one session.
//
// validate_input is off, not the usual default-on: the model carries a `load_cases` object
// (see trussModel.js) and the live API's validate_input schema currently rejects the
// load_cases design-code outer key - even for keys taken directly from a platform-exported
// model. S3D.model.set/solve accept and persist it correctly regardless (confirmed via
// S3D.model.get echoing it back unchanged). Known gap in the validator schema, not a model
// error; re-enable once that is fixed upstream.
async function runSession(functions, { options } = {}) {
  const auth = getCreds();
  const body = {
    auth,
    options: { validate_input: false, ...options },
    functions: [{ function: 'S3D.session.start', arguments: { keep_open: true } }, ...functions],
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();

  if (!res.ok || json?.response?.status !== 0) {
    const msg = json?.response?.msg || `SkyCiv API request failed (HTTP ${res.status})`;
    throw new SkyCivError(msg, json);
  }
  return json; // { response: {...}, functions: [ per-call results, session.start first ] }
}

module.exports = { runSession, SkyCivError, API_URL };
