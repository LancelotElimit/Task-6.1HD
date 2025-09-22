import React from "react";
import Cards from "./Cards";
import ArticleList from "./ArticleList";
import './Cards.css'

function cardComponent (staff , i){
    return <Cards
        key = {staff.key}
        avatar = {staff.avatar}
        name = {staff.name}
        position = {staff.position}
    />
}


const CardList = () =>
{
    return <div>
                <h1>Website Contributor</h1>
                <div className="row">

        {ArticleList.map((staff) =>
            cardComponent(staff)
        )}

        </div>
    </div>
}

export default CardList