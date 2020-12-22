function onlyUnique(value: any, index: number, self: any): boolean {
  return self.indexOf(value) === index;
}

export const uniqueArray = (arr: any[]): any[] => {
  return arr.filter(onlyUnique);
};
