
const isObjectPropertyEmpty=(obj,data)=>{
    const updatedObject={...obj};
    for(property in obj){
        if(obj[property]===""||obj[property]===undefined){
            updatedObject[property]=data[property]
        }
    }
    return updatedObject;
}
module.exports=isObjectPropertyEmpty;