export type SOAPField = 'subjective' | 'objective' | 'assessment' | 'plan';

export interface SOAPNote {
  _id?: string;
  pet_id: string;
  tenant_id?: string;
  field: SOAPField;
  text: string;
  species?: string;
  breed?: string;
  age_bucket?: string;
  created_date?: string;
  updated_date?: string;
} 