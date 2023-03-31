import express from 'express';
import {data} from "./getDb.js";
import cors from 'cors';
// import { changeBrand } from './changeBrand.js';
import {execute} from './getDb.js'

let front_brand_code = "M";

let query=`with main as (
  select b.style_cd
       , case when max(parent_prdt_kind_nm) = '의류' then max(b.part_cd) else b.style_cd end as repr_cd
       , max(b.parent_prdt_kind_nm)                                                       as parent_prdt_kind_nm
       , max(b.prdt_nm)                                                                   as prdt_nm
       , max(tag_price)                                                                   as tag_price
       , a.end_dt                                                                         as end_dt
       , sum(sale_nml_sale_amt_cns + sale_ret_sale_amt_cns)                               as sale_amt
       , sum(sale_nml_tag_amt_cns + sale_ret_tag_amt_cns)                                 as sale_tag
       , sum(sale_nml_qty_cns + sale_ret_qty_cns)                                         as sale_qty
       , sum(sale_nml_qty_rtl + sale_ret_qty_rtl)                                         as sale_qty_rtl
       , sum(sale_nml_qty_notax + sale_ret_qty_notax)                                     as sale_qty_notax
       , sum(sale_nml_qty_rf + sale_ret_qty_rf)                                           as sale_qty_rfdome
       , sum(sale_nml_qty_rf + sale_ret_qty_rf + sale_nml_qty_notax + sale_ret_qty_notax) as sale_qty_dutyrfdome
       , sum(wh_stock_qty)                                                                as wh_stock_qty
       , sum(stock_qty)                                                                   as stock_qty
       , sum(ac_stor_qty_kor)                                                             as ac_stor_qty_kor
       , sum(ac_sale_nml_qty_cns + ac_sale_ret_qty_cns)                                   as ac_sale_qty_cns
  from prcs.db_scs_w a,
       prcs.db_prdt b
  where a.prdt_cd = b.prdt_cd
  and a.brd_cd = '${front_brand_code}'
  and end_dt between '2023-03-19'-7*12 and '2023-03-19'
    --and sub_cat_nm in ('x')
    --and domain1_nm in ('int')
    --and (a.sesn||'_' || sesn_sub_nm) in ('int')
    --and item in ('int')
    --and adult_kids_nm in ('int')
    --and sex_nm in ('int','성별','공용','남성','아동','여성')
  group by b.style_cd, a.end_dt
)
select a.ranking                                                                        as ranking
   , case
         when b.ranking is null or b.ranking = a.ranking then '-'
         when b.ranking > a.ranking then '↑' || b.ranking - a.ranking
         else '↓' || a.ranking - b.ranking
  end                                                                                 as rank_growth
   , nvl(b.ranking, 0) - a.ranking                                                    as rank_check
   , nvl(b.ranking, 0)                                                                as ranking_2wks
   , a.style_cd                                                                       as prdt_cd
   , repr_cd
   , a.prdt_nm                                                                        as prdt_nm
   , e.tag_price                                                                        as tag_price
   , d.resize_url                                                                            as image_name
   , a.sale_amt / 1000000                                                           as sale_amt_kor_ttl
   , case when sale_tag =0 then 0 else round((1-(sale_amt::numeric /sale_tag))*100) end as discount
   , case when a.sale_qty = 0 then 0 else round(a.sale_amt::numeric / a.sale_qty) end as asp
   , case when c.sale12 = '0' then '' else c.sale12 end                               as sales12
   , a.sale_qty                                                                       as sale_qty_kor_ttl
   , a.sale_qty_rtl                                                                   as sale_qty_kor_retail
   , a.sale_qty_notax                                                                 as sale_qty_kor_duty
   , a.sale_qty_rfdome                                                                as sale_qty_kor_rfwholesale
   , a.sale_qty_dutyrfdome                                                            as sale_qty_kor_dutyrfwholesale
   , a.wh_stock_qty                                                                   as wh_stock_qty_kor
   , a.stock_qty                                                                      as stock_qty_kor
   , sale_qty_4wk_avg
   , ac_sale_qty_cns
   , ac_stor_qty_kor
   , case
         when parent_prdt_kind_nm = 'ACC' and sale_qty_4wk_avg != 0 then round(a.stock_qty::numeric / sale_qty_4wk_avg)
         when parent_prdt_kind_nm != 'ACC' and a.sale_qty != 0 then round(a.stock_qty::numeric / a.sale_qty)
         else a.stock_qty end                                                         as woi
   , case
         when ac_stor_qty_kor != 0 then round(ac_sale_qty_cns::numeric / ac_stor_qty_kor * 100)
         else 0 end                                                                  as sale_rate
   , mfac_compy_nm_list
from (
  select style_cd
        , repr_cd
        , row_number() over ( order by sale_amt desc) ranking
        , parent_prdt_kind_nm
        , tag_price
        , prdt_nm
        , sale_amt
        , sale_tag
        , sale_qty
        , sale_qty_rtl
        , sale_qty_notax
        , sale_qty_rfdome
        , sale_qty_dutyrfdome
        , wh_stock_qty
        , stock_qty
        , ac_stor_qty_kor
        , ac_sale_qty_cns
  from main
  where end_dt = '2023-03-19'
) a
left join (
   select style_cd
        , row_number() over ( order by sale_amt desc) ranking
  from main
  where end_dt = '2023-03-19'-7
) b
on a.style_cd = b.style_cd
left join (
   select style_cd, listagg(sale_qty,',') within group ( order by end_dt ) sale12
  from (
      select style_cd, end_dt, sum(sale_qty) sale_qty
      from main
      group by style_cd, end_dt
  )a
  group by style_cd
) c
on a.style_cd = c.style_cd
left join (select style_cd, round(sum(sale_qty) / 4) as sale_qty_4wk_avg
          from main
          where end_dt between '2023-03-19' - 7 * 3 and '2023-03-19'
          group by style_cd) z
         on a.style_cd = z.style_cd
left join prcs.db_style_img d
on a.style_cd = d.style_cd
and d.default_yn = true
left join ( select style_cd, listagg(tag_price, ',') within group ( order by tag_price desc ) tag_price
          from (select distinct style_cd, tag_price from prcs.db_prdt)a
          group by style_cd) e on (a.style_cd = e.style_cd)
left join (select style_cd
                              , listagg(distinct mfac_compy_nm,',') within group (order by indc_dt_req desc) as mfac_compy_nm_list
              from prcs.dw_ord
              where po_cntry in ('A','KR')
              and apv_dt is not null
              group by style_cd) f on a.style_cd = f.style_cd
order by 1
limit 10`


const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

execute(query);

app.get('/', (req, res) => {
  execute(query);
  res.send(data)
  console.log("[server.js] get 요청이 오면 찍히는 콘솔:",data)
})



// app.get('/', (req, res) => {
//   execute(query)
//     .then(data => res.send(data))
//     .catch(err => { throw err });
// });


app.post("/brand_name", (req,res)=>{
    console.log("[server.js] app.post 함수 실행 시작")
    let brand = req.body;
    console.log("[server.js] brand:",brand.brand);
    front_brand_code=brand.brand
    console.log("[server.js] front_brand_code:", front_brand_code);
    query = changeQuery(front_brand_code);
    console.log(query);
    execute(query);

    
  });

  //포스트가 오면 쿼리 바꿔주는 함수

// changeBrand(front_brand_code){
//   return 
// }

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})





function changeQuery (v){
  return `with main as (
    select b.style_cd
         , case when max(parent_prdt_kind_nm) = '의류' then max(b.part_cd) else b.style_cd end as repr_cd
         , max(b.parent_prdt_kind_nm)                                                       as parent_prdt_kind_nm
         , max(b.prdt_nm)                                                                   as prdt_nm
         , max(tag_price)                                                                   as tag_price
         , a.end_dt                                                                         as end_dt
         , sum(sale_nml_sale_amt_cns + sale_ret_sale_amt_cns)                               as sale_amt
         , sum(sale_nml_tag_amt_cns + sale_ret_tag_amt_cns)                                 as sale_tag
         , sum(sale_nml_qty_cns + sale_ret_qty_cns)                                         as sale_qty
         , sum(sale_nml_qty_rtl + sale_ret_qty_rtl)                                         as sale_qty_rtl
         , sum(sale_nml_qty_notax + sale_ret_qty_notax)                                     as sale_qty_notax
         , sum(sale_nml_qty_rf + sale_ret_qty_rf)                                           as sale_qty_rfdome
         , sum(sale_nml_qty_rf + sale_ret_qty_rf + sale_nml_qty_notax + sale_ret_qty_notax) as sale_qty_dutyrfdome
         , sum(wh_stock_qty)                                                                as wh_stock_qty
         , sum(stock_qty)                                                                   as stock_qty
         , sum(ac_stor_qty_kor)                                                             as ac_stor_qty_kor
         , sum(ac_sale_nml_qty_cns + ac_sale_ret_qty_cns)                                   as ac_sale_qty_cns
    from prcs.db_scs_w a,
         prcs.db_prdt b
    where a.prdt_cd = b.prdt_cd
    and a.brd_cd = '${v}'
    and end_dt between '2023-03-19'-7*12 and '2023-03-19'
      --and sub_cat_nm in ('x')
      --and domain1_nm in ('int')
      --and (a.sesn||'_' || sesn_sub_nm) in ('int')
      --and item in ('int')
      --and adult_kids_nm in ('int')
      --and sex_nm in ('int','성별','공용','남성','아동','여성')
    group by b.style_cd, a.end_dt
  )
  select a.ranking                                                                        as ranking
     , case
           when b.ranking is null or b.ranking = a.ranking then '-'
           when b.ranking > a.ranking then '↑' || b.ranking - a.ranking
           else '↓' || a.ranking - b.ranking
    end                                                                                 as rank_growth
     , nvl(b.ranking, 0) - a.ranking                                                    as rank_check
     , nvl(b.ranking, 0)                                                                as ranking_2wks
     , a.style_cd                                                                       as prdt_cd
     , repr_cd
     , a.prdt_nm                                                                        as prdt_nm
     , e.tag_price                                                                        as tag_price
     , d.resize_url                                                                            as image_name
     , a.sale_amt / 1000000                                                           as sale_amt_kor_ttl
     , case when sale_tag =0 then 0 else round((1-(sale_amt::numeric /sale_tag))*100) end as discount
     , case when a.sale_qty = 0 then 0 else round(a.sale_amt::numeric / a.sale_qty) end as asp
     , case when c.sale12 = '0' then '' else c.sale12 end                               as sales12
     , a.sale_qty                                                                       as sale_qty_kor_ttl
     , a.sale_qty_rtl                                                                   as sale_qty_kor_retail
     , a.sale_qty_notax                                                                 as sale_qty_kor_duty
     , a.sale_qty_rfdome                                                                as sale_qty_kor_rfwholesale
     , a.sale_qty_dutyrfdome                                                            as sale_qty_kor_dutyrfwholesale
     , a.wh_stock_qty                                                                   as wh_stock_qty_kor
     , a.stock_qty                                                                      as stock_qty_kor
     , sale_qty_4wk_avg
     , ac_sale_qty_cns
     , ac_stor_qty_kor
     , case
           when parent_prdt_kind_nm = 'ACC' and sale_qty_4wk_avg != 0 then round(a.stock_qty::numeric / sale_qty_4wk_avg)
           when parent_prdt_kind_nm != 'ACC' and a.sale_qty != 0 then round(a.stock_qty::numeric / a.sale_qty)
           else a.stock_qty end                                                         as woi
     , case
           when ac_stor_qty_kor != 0 then round(ac_sale_qty_cns::numeric / ac_stor_qty_kor * 100)
           else 0 end                                                                  as sale_rate
     , mfac_compy_nm_list
  from (
    select style_cd
          , repr_cd
          , row_number() over ( order by sale_amt desc) ranking
          , parent_prdt_kind_nm
          , tag_price
          , prdt_nm
          , sale_amt
          , sale_tag
          , sale_qty
          , sale_qty_rtl
          , sale_qty_notax
          , sale_qty_rfdome
          , sale_qty_dutyrfdome
          , wh_stock_qty
          , stock_qty
          , ac_stor_qty_kor
          , ac_sale_qty_cns
    from main
    where end_dt = '2023-03-19'
  ) a
  left join (
     select style_cd
          , row_number() over ( order by sale_amt desc) ranking
    from main
    where end_dt = '2023-03-19'-7
  ) b
  on a.style_cd = b.style_cd
  left join (
     select style_cd, listagg(sale_qty,',') within group ( order by end_dt ) sale12
    from (
        select style_cd, end_dt, sum(sale_qty) sale_qty
        from main
        group by style_cd, end_dt
    )a
    group by style_cd
  ) c
  on a.style_cd = c.style_cd
  left join (select style_cd, round(sum(sale_qty) / 4) as sale_qty_4wk_avg
            from main
            where end_dt between '2023-03-19' - 7 * 3 and '2023-03-19'
            group by style_cd) z
           on a.style_cd = z.style_cd
  left join prcs.db_style_img d
  on a.style_cd = d.style_cd
  and d.default_yn = true
  left join ( select style_cd, listagg(tag_price, ',') within group ( order by tag_price desc ) tag_price
            from (select distinct style_cd, tag_price from prcs.db_prdt)a
            group by style_cd) e on (a.style_cd = e.style_cd)
  left join (select style_cd
                                , listagg(distinct mfac_compy_nm,',') within group (order by indc_dt_req desc) as mfac_compy_nm_list
                from prcs.dw_ord
                where po_cntry in ('A','KR')
                and apv_dt is not null
                group by style_cd) f on a.style_cd = f.style_cd
  order by 1
  limit 10`;
}

