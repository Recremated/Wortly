export interface Kelime {
  id: number;
  kelime: string;
  tür: "verb" | "noun";
  çekimler?: {
    ich: string;
    du: string;
    er_sie_es: string;
    wir: string;
    ihr: string;
    sie_Sie: string;
  };
  perfekt?: string;
  anlam: string;
  örnek: string;
}
