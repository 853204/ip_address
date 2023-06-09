
const redisClient = require("../helpers/redis");
const axios = require("axios");
const userCitiesList = require("../models/city.model");
const user = require("../models/user.model");
const API_KEY = process.env.OA_API_KEY;

const getCityData = async (req, res) => {

    try {


        const city = req.params.city || req.body.preferred_city;


        const isCityInCache = await redisClient.get(`${city}`);

        console.log(isCityInCache)

        if (isCityInCache) return res.status(200).send({ data: isCityInCache });


        const response = await axios.get(`https://ipapi.co/8.8.8.8/current.json?key=${API_KEY}&q=${city}`)


        const location = response.data;


        console.log(location)

        redisClient.set(city, JSON.stringify(location), { EX: 30 * 60 });


        await userCitiesList.findOneAndUpdate({ userId: req.body.userId }, {
            userId: req.body.userId, $push: { previousSearches: city }
        }, { new: true, upsert: true, setDefaultsOnInsert: true })


        return res.send({ data: location });

    } catch (err) {
        return res.status(500).send(err.messsage);
    }

}


const mostSearchedCity = async (req, res) => {
    
    try {

        const cities = await userCitiesList.aggregate([
            
            {
                 $match: { 
                    userId: req.body.userId
                } 
            },
            
            {
                $unwind: "$previousSearches"
            }
            ,
            {
                $group: {
                    _id: "$previousSearches",
                    count: { $sum: 1 }
                }
            },

            {
                $sort: { count: -1 }
            }
            ]);



        const city = cities[0]["_id"]

        const isCityInCache = await redisClient.get(`${city}`);

       

        if (isCityInCache) return res.status(200).send({ data: isCityInCache });


        const response = await axios.get(`https://ipapi.co/8.8.8.8/current.json?key=${API_KEY}&q=${city}`)


        const location = response.data;


       

        redisClient.set(city, JSON.stringify(location), { EX: 30 * 60 });


        await userCitiesList.findOneAndUpdate({ userId: req.body.userId }, {
            userId: req.body.userId, $push: { previousSearches: city }
        }, { new: true, upsert: true, setDefaultsOnInsert: true })


        return res.send({ data: location });

    } catch (err) {
        return res.status(500).send(err.messsage);
    }

}

module.exports = { getCityData, mostSearchedCity };



