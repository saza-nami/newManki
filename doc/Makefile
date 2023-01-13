TARGETS=	intro.pdf \
		astar.pdf \
		createUser.pdf \
		endRoute.pdf \
		execRoute.pdf \
		isAcceptable.pdf \
		monitorCar.pdf \
		proceedRoute.pdf \
		reqPassable.pdf \
		reqRoute.pdf \
		routeName.pdf \
		saveRoute.pdf \
		sendCarInfo.pdf \
		terminate.pdf

PANDOC=		pandoc
PANDOCFLAGS=	--pdf-engine=xelatex \
		-V classoption=pandoc \
		-V documentclass=bxjsarticle \
		-V papersize:a4
RM=		rm -f
SHELL=		/bin/sh

all: $(TARGETS)

.SUFFIXES:
.SUFFIXES: .md .pdf

.md.pdf:
	$(PANDOC) $(PANDOCFLAGS) $< -o $@

.PHONY: clean
clean:
	$(RM) $(TARGETS)
