/**
 * Auth types.
 *
 * OAuth token / request shapes are defined once in `../interfaces/oauth` and
 * re-exported here so both import paths stay in sync.
 */
export type {
  OAuthTokenPair,
  RequestTokenResponse,
  AccessTokenParams,
} from '../interfaces/oauth';

export interface UserIdentityResponse {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

/** Local callback-server options — Node only, used by `NodeAuth`. */
export interface CallbackConfig {
  port?: number;
  host?: string;
  path?: string;
  timeout?: number;
  customSuccessHtml?: string;
}
