export type DecoderCatalog = {
  manufacturers: {id:number;name:string}[];
  models: {id:number;manufacturerId:number;name:string}[];
};
export const decoderCatalogKey = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('cs').replace(/\s+/g,' ');
