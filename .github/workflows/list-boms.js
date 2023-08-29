// List all bom files in /public and write boms.json
import * as fs from 'fs'

const BOM_LIST = 'public/boms.json'

fs.rmSync(BOM_LIST, {force: true})

const files = fs.readdirSync('public').filter(f => f.endsWith('.json'))

fs.writeFileSync(BOM_LIST, JSON.stringify(files))
