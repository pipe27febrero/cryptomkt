import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CryptomktService } from '@cryptomkt/cryptomkt.service'
import { ResponseCryptoMkt } from '@cryptomkt/interfaces/response-crypto-mkt.interface';
import { CoinService } from '@coin/coin.service';
import { toCoinDto } from '@coin/mapper';
import { Coin } from '@coin/entities/coin.entity';
import { ResponseCoin } from '@cryptomkt/interfaces/response-coin.interface';
import { LocalindicatorService } from 'localindicator/localindicator.service';
import { ValueDto } from 'localindicator/dto/value.dto';
import { CoinDto } from '@coin/dto/coin.dto';

@Injectable()
export class TasksService {
  constructor(private readonly cryptoMktService : CryptomktService,
              private readonly coinService : CoinService,
              private readonly localIndicatorService : LocalindicatorService){}
  private readonly logger = new Logger(TasksService.name);

  @Cron("*/10 * * * * *")
  async updateCoinsCryptoMkt() {
      const coins : Array<Coin> = await this.coinService.getAll()
      const symbols = coins.map(coin => coin.symbol)
      
      let promises = symbols.map(symbol => this.cryptoMktService.getMarketPrice(symbol+'CLP')) // get markets price in clp
      let responses : Array<ResponseCryptoMkt> = null
      
      responses = await Promise.all(promises)
      let datas : Array<ResponseCoin> = responses.map(({data}) => data[0])
      
      let priceUsdInClp : number = await this.localIndicatorService.getUsdCurrentValueInClp()

      datas.forEach(data => {
        let symbol = data.market.substring(0,3)
        let coin : Coin = coins.find(coin => coin.symbol === symbol)
        if(coin)
        {
            coin.priceClp = data.last_price
            coin.priceUsd = coin.priceClp/priceUsdInClp
            coin.lastUpdate = data.timestamp
        }
      })

      let coinsSaved : Array<Coin> = await this.coinService.saveMany(coins)
     // let coinsDto : Array<CoinDto> = coinsSaved.map(coin => toCoinDto(coin))

  }
}