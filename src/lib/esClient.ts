import { Client } from '@elastic/elasticsearch';
import { config } from './config';

export const esClient = new Client({ node: config.ES_URL }); 