const isNullOrUndefined = (val: any): val is true => {
    return (val === undefined || val === null)
}

const hasOwnProperty = (o: any, name: string): boolean => {
    return o.hasOwnProperty(name)
}

export { isNullOrUndefined, hasOwnProperty }