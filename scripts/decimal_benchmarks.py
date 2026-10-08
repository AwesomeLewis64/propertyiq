from decimal import Decimal as D, getcontext
getcontext().prec = 40
P = D('1820000'); r=D('.06')/12; n=360
pmt=P*r/(1-(1+r)**(-n))
balance=P
equity=D('2800000')+56000+160000+P*D('.01')-P
noi=[]; ops=[]; flows=[-equity]
for year in range(1,7):
    gross=D('456000')*D('1.04')**(year-1)
    egi=gross*D('.935')+D('10200')*D('1.02')**(year-1)
    exp=D('56000')*D('1.03')**(year-1)+D('24000')*D('1.04')**(year-1)+D('80000')*D('1.025')**(year-1)
    net=egi-exp-egi*D('.05')
    noi.append(net)
    if year<=5:
        for j in range(12): balance=balance*(1+r)-pmt
        cash=net-pmt*12-D('16000')*D('1.025')**(year-1)
        flows.append(cash)
cap=noi[0]/D('2800000')+D('.00625')
sale=noi[5]/cap*D('.975')-balance
flows[-1]+=sale
lo=D('-.99'); hi=D('1')
for i in range(240):
    mid=(lo+hi)/2
    npv=sum(f/(1+mid)**j for j,f in enumerate(flows))
    if npv>0: lo=mid
    else: hi=mid
print('equity', equity, 'NOI', noi, 'exit cap',cap, 'balance',balance,'sale',sale,'IRR',(lo+hi)/2,'multiple',sum(flows[1:])/equity)
for term in (360,336,120,108):
    principal=D('1000000') if term>120 else D('120000')
    payment=principal*r/(1-(1+r)**(-term))
    print('payment',term,payment)

noiy1=D('254732')
print('DSCR loan limit at 3x', noiy1/D('3')/(r/(1-(1+r)**(-360))*12))
print('debt yield loan limit at 30%',noiy1/D('.30'))
print('LTV loan limit at 20%',D('2800000')*D('.20'))

principal=D('500000')
monthly=principal*r/(1-(1+r)**(-360))
print('500k monthly payment',monthly)
for months in (12,60):
    closed_balance=principal*(1+r)**months-monthly*((1+r)**months-1)/r
    print('500k balance month',months,closed_balance)
print('actual/360 January IO',D('1000000')*D('.06')*31/360)
print('actual/360 365-day IO year',D('1000000')*D('.06')*365/360)
