// C++17 simulation core starter for the OBSERVE-inspired browser project.
// The current browser build runs app.js directly so it works without a WASM toolchain.
// This file provides the corresponding native/portable simulation model for a future
// Emscripten WebAssembly build. It intentionally has no desktop-only dependencies.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <random>
#include <string>
#include <vector>

namespace observe {
struct Nation {
    int id{};
    std::string name;
    double populationMillions{10};
    double gdpBillions{100};
    double treasury{100};
    double stability{75};
    double technology{1};
    std::int64_t army{50000};
    std::int64_t manpower{100000};
    std::int64_t casualties{0};
    bool alive{true};
};
struct War { int attacker{}, defender{}, months{}; double progress{}; };
struct BattleResult { std::int64_t attackerLosses{}, defenderLosses{}; bool attackerWon{}; };
class Simulation {
    std::mt19937 rng{std::random_device{}()};
    double roll(double lo, double hi) { return std::uniform_real_distribution<double>(lo,hi)(rng); }
public:
    int month{1}, year{1};
    std::vector<Nation> nations;
    std::vector<War> wars;
    void advanceMonth() {
        if (++month > 12) { month=1; ++year; }
        for (auto& n:nations) if(n.alive) {
            const double growth=(n.stability/100.0)*0.0015-0.0002;
            n.populationMillions=std::max(0.1,n.populationMillions*(1.0+growth));
            n.gdpBillions=std::max(1.0,n.gdpBillions*(1.0+roll(-0.004,0.012)+n.technology*0.0008));
            n.treasury += n.gdpBillions*0.0015-static_cast<double>(n.army)*0.000015;
            n.stability=std::clamp(n.stability+roll(-0.45,0.35)-(n.treasury<0?1.2:0.0),0.0,100.0);
            auto recruits=std::min<std::int64_t>(n.manpower,static_cast<std::int64_t>(n.populationMillions*20));
            n.army+=recruits; n.manpower-=recruits; n.technology+=roll(0.0002,0.001);
        }
        for(auto it=wars.begin();it!=wars.end();) {
            auto findNation=[&](int id)->Nation* { for(auto& n:nations) if(n.id==id)return &n; return nullptr; };
            Nation* a=findNation(it->attacker); Nation* d=findNation(it->defender);
            if(!a||!d||!a->alive||!d->alive){it=wars.erase(it);continue;}
            ++it->months;
            double ap=a->army*a->technology*(0.55+a->stability/200.0)*roll(0.8,1.2);
            double dp=d->army*d->technology*(0.60+d->stability/180.0)*roll(0.8,1.2);
            auto al=std::min<std::int64_t>(a->army,static_cast<std::int64_t>(roll(200,1800)*(1+dp/(ap+1))));
            auto dl=std::min<std::int64_t>(d->army,static_cast<std::int64_t>(roll(250,2100)*(1+ap/(dp+1))));
            a->army-=al; d->army-=dl; a->casualties+=al; d->casualties+=dl;
            it->progress=std::clamp(it->progress+(ap>dp?roll(5,15):roll(-3,5)),0.0,100.0);
            if(it->progress>=100||d->army<1000){d->alive=false;a->populationMillions+=d->populationMillions*0.5;a->gdpBillions+=d->gdpBillions*0.5;it=wars.erase(it);}else ++it;
        }
    }
    BattleResult resolveBattle(const Nation& attacker,const Nation& defender,double terrainDefense) {
        double attack=attacker.army*attacker.technology*(0.5+attacker.stability/100.0)*roll(0.85,1.15);
        double defense=defender.army*defender.technology*terrainDefense*(0.5+defender.stability/100.0)*roll(0.85,1.15);
        BattleResult r; r.attackerWon=attack>defense;
        r.attackerLosses=static_cast<std::int64_t>(roll(500,3500)*(r.attackerWon?1:2));
        r.defenderLosses=static_cast<std::int64_t>(roll(500,3500)*(r.attackerWon?2:1));
        return r;
    }
};
} // namespace observe
