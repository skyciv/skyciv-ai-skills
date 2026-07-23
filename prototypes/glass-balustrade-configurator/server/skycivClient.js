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
// Injects a session-start call as the first call so the whole batch shares one session.
// Defaults to S3D.session.start (correct for S3D.* and cloudcad.* namespaces), but pass
// `sessionFunction: 'standalone.loads.start'` for load-gen-api's `standalone.loads.*`
// calls - confirmed against the live API that S3D.session.start does NOT work as the
// opener for standalone.loads.getLoads (it fails with a generic "could not be completed
// for an unknown reason" error on the getLoads call itself, even though session.start
// itself reports success) - each namespace needs its own matching *.start call, they are
// not interchangeable "combined session" openers despite CLAUDE.md previously (wrongly)
// suggesting otherwise.
//
// validate_input is off, not the usual default-on: the model carries a `load_cases`
// object (see balustradeModel.js) and the live API's validate_input schema currently
// rejects the load_cases design-code outer key - even for keys taken directly from a
// platform-exported model. S3D.model.set/solve accept and persist it correctly
// regardless (confirmed against the live API by the truss-designer prototype this app
// is based on). Known gap in the validator schema, not a model error; re-enable once
// that is fixed upstream.
async function runSession(functions, { options, sessionFunction = 'S3D.session.start' } = {}) {
  const auth = getCreds();
  const body = {
    auth,
    options: { validate_input: false, ...options },
    functions: [{ function: sessionFunction, arguments: { keep_open: true } }, ...functions],
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
