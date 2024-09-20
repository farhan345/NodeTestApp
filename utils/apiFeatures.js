class ApiFeatures{
    constructor(query,queryStr){
        this.query=query,
        this.queryStr=queryStr
    }

    search(){
        // we use keyword as a variable for searching
        const keyword=this.queryStr.keyword?{
            name:{$regex:this.queryStr.keyword,$options:"i"}
        }:{}
        this.query=this.query.find({...keyword})
        return this;

    }
    filter(){
        const removeFields=["page"];
        const queryCopy={...this.queryStr}
        
        removeFields.forEach((key)=>delete queryCopy[key]);
        console.log( queryCopy);
        if(queryCopy.vehicleType==="All"&&queryCopy.brand==="All"){
            this.query=this.query.find();
            return this;
        }
        else if(queryCopy.vehicleType==="All"){
            this.query=this.query.find({brand:queryCopy.brand});
            return this;
        }
        else if(queryCopy.brand==="All"){
            this.query=this.query.find({brand:queryCopy.vehicleType});
            return this;
        }
        this.query=this.query.find(queryCopy)
        return this;
        

    }
    pagination(resultPerPage){
        const currentPage=this.queryStr.page||1;
        const skip=resultPerPage*(currentPage-1)
        this.query=this.query.find().limit(resultPerPage).skip(skip)
        return this;
    }
}

module.exports=ApiFeatures;