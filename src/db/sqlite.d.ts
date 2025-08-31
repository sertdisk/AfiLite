import { Knex } from 'knex';

declare const knex: Knex;

interface Influencer {
  id: number;
  email: string;
  // Add other properties of an influencer if known
}

declare function checkInfluencer(email: string): Promise<Influencer | null>;

export default knex;
export { checkInfluencer };